module.exports = async (context) => {
  const config = await context.config('delete-merged-branch-config.yml', { exclude: [] })
  const headRepoId = context.payload.pull_request.head.repo.id
  const baseRepoId = context.payload.pull_request.base.repo.id

  const owner = context.payload.repository.owner.login
  const repo = context.payload.repository.name
  const branchName = context.payload.pull_request.head.ref
  const ref = `heads/${branchName}`
  const html_url = context.payload.pull_request.html_url

  const baseBranchName = context.payload.pull_request.base.ref
  const { IncomingWebhook } = require('@slack/client');
  const slack_url = process.env.SLACK_WEBHOOK_URL;
  const webhook = new IncomingWebhook(slack_url);

  if (headRepoId !== baseRepoId) {
    context.log.info(`Closing PR from fork. Keeping ${context.payload.pull_request.head.label}`)
    return
  }

  if (!context.payload.pull_request.merged) {
    context.log.info(`PR was closed but not merged. Keeping ${owner}/${repo}/${ref}`)
    return
  }

  // リリースする時、通知がほしいので
  if (baseBranchName == 'release') {
    webhook.send(` <@here> 下記の変更をリリースされます \n ${html_url}`, function(err, res) {
      if (err) {
        context.log.warn(err, 'Error');
      } else {
        context.log.info(err, 'Message sent');
      }
    });
  }

  if (config.exclude.includes(branchName)) {
    context.log.info(`Branch ${branchName} excluded. Keeping ${context.payload.pull_request.head.label}`)
    return
  }

  try {
    await context.github.gitdata.deleteReference({ owner, repo, ref })
    context.log.info(`Successfully deleted ${owner}/${repo}/${ref}`)
  } catch (e) {
    context.log.warn(e, `Failed to delete ${owner}/${repo}/${ref}`)
  }

}
